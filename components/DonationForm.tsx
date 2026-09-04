'use client';

import React, { useState, useEffect } from 'react';
import { amountToIndianWords } from '@/lib/number-to-words';
import { ShieldCheck, CheckCircle2, AlertCircle, Sparkles, RefreshCw } from 'lucide-react';
import { ReceiptData } from './DigitalReceipt';

interface Props {
  onSuccess: (receipt: ReceiptData) => void;
}

export default function DonationForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState({
    ac: 'AC-DEL-01',
    date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
    contributorName: '',
    address: '',
    district: 'Indore',
    pinCode: '452001',
    contactNo: '',
    panAadhaar: '',
    receiverName: 'Youth Peace Foundation',
    amount: '100',
    paymentMode: 'UPI',
    transactionId: ''
  });

  const [amountWords, setAmountWords] = useState('One Hundred Rupees Only');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bank verification state
  const [isVerifyingBank, setIsVerifyingBank] = useState(false);
  const [bankVerificationResult, setBankVerificationResult] = useState<{
    status: 'VERIFIED' | 'PENDING' | 'AMOUNT_MISMATCH' | 'NOT_FOUND' | null;
    message: string | null;
    bankName?: string;
    authRef?: string;
  }>({ status: null, message: null });

  // Update amount in words when amount changes
  useEffect(() => {
    const num = parseFloat(formData.amount);
    if (!isNaN(num) && num > 0) {
      setAmountWords(amountToIndianWords(num));
    } else {
      setAmountWords('Zero Rupees Only');
    }
    // Reset bank verify status when amount or UTR changes
    setBankVerificationResult({ status: null, message: null });
  }, [formData.amount, formData.transactionId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAmountPreset = (val: string) => {
    setFormData(prev => ({ ...prev, amount: val }));
  };

  // Instant Bank Verification check
  const handleVerifyBankLive = async () => {
    if (!formData.transactionId.trim()) {
      setBankVerificationResult({
        status: 'NOT_FOUND',
        message: 'Please enter a Transaction ID / UTR to verify.'
      });
      return;
    }

    const num = parseFloat(formData.amount);
    if (isNaN(num) || num <= 0) {
      setBankVerificationResult({
        status: 'AMOUNT_MISMATCH',
        message: 'Please enter a valid amount before bank verification.'
      });
      return;
    }

    setIsVerifyingBank(true);
    try {
      const res = await fetch('/api/bank/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utr: formData.transactionId.trim(),
          amount: num
        })
      });
      const data = await res.json();
      setBankVerificationResult({
        status: data.status,
        message: data.message,
        bankName: data.bankName,
        authRef: data.bankAuthRef
      });
    } catch (err: any) {
      setBankVerificationResult({
        status: 'NOT_FOUND',
        message: 'Bank verification network error: ' + err.message
      });
    } finally {
      setIsVerifyingBank(false);
    }
  };

  // Load sample donor data from reference images
  const loadSampleReference = (type: 'reference1' | 'slip2') => {
    if (type === 'reference1') {
      setFormData({
        ac: 'YPF-HQ',
        date: '27/08/2026',
        contributorName: 'Kripa Singhal',
        address: 'B-12, Peace Street, Civil Lines',
        district: 'Indore',
        pinCode: '452001',
        contactNo: '9876543210',
        panAadhaar: 'XXXX XXXX 1234',
        receiverName: 'Youth Peace Foundation',
        amount: '1000',
        paymentMode: 'UPI / NetBanking',
        transactionId: 'AXISNP1234567890'
      });
    } else {
      setFormData({
        ac: 'AC-DEL-02',
        date: new Date().toLocaleDateString('en-GB'),
        contributorName: 'Rahul Sharma',
        address: 'X-32, Okhla Industrial Area, Phase II',
        district: 'South Delhi',
        pinCode: '110020',
        contactNo: '9811223344',
        panAadhaar: 'AAACY7098K',
        receiverName: 'Youth Peace Foundation',
        amount: '100',
        paymentMode: 'UPI',
        transactionId: 'UPI423456789012'
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation
    if (!formData.contributorName.trim()) {
      setErrorMessage('Please enter the Contributor / Donor Name');
      return;
    }
    if (!formData.contactNo.trim()) {
      setErrorMessage('Please enter the Contact Number');
      return;
    }
    if (!formData.district.trim() || !formData.pinCode.trim()) {
      setErrorMessage('District and PIN Code are required');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/receipts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          autoVerifyBank: true
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create receipt');
      }

      // Success: pass to parent to render digital receipt
      onSuccess(data.receipt);
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="donationForm">
      {/* Quick Fill Toolbar */}
      <div className="sampleToolbar">
        <span className="sampleLabel">⚡ Quick Fill Test Samples:</span>
        <button
          type="button"
          onClick={() => loadSampleReference('reference1')}
          className="sampleBtn"
        >
          Sample 1 (Image 1 Ref: ₹1,000 / Axis Bank)
        </button>
        <button
          type="button"
          onClick={() => loadSampleReference('slip2')}
          className="sampleBtn"
        >
          Sample 2 (Image 2 Slip: ₹100 / UPI)
        </button>
      </div>

      {errorMessage && (
        <div className="formErrorAlert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="formgrid">
        {/* Row 1: AC and Date */}
        <div className="field">
          <label htmlFor="ac">AC (Area Coordinator / Center Code)</label>
          <input
            id="ac"
            name="ac"
            type="text"
            placeholder="e.g. AC-IND-01 or Delhi Center"
            value={formData.ac}
            onChange={handleChange}
          />
          <span className="fieldHint">From paper slip top header</span>
        </div>

        <div className="field">
          <label htmlFor="date">Date *</label>
          <input
            id="date"
            name="date"
            type="text"
            placeholder="DD/MM/YYYY"
            value={formData.date}
            onChange={handleChange}
            required
          />
          <span className="fieldHint">Issue date of contribution</span>
        </div>

        {/* Row 2: Name and Contact */}
        <div className="field">
          <label htmlFor="contributorName">Contributor Name *</label>
          <input
            id="contributorName"
            name="contributorName"
            type="text"
            placeholder="Full Name of Contributor"
            value={formData.contributorName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="contactNo">Contact No. *</label>
          <input
            id="contactNo"
            name="contactNo"
            type="tel"
            placeholder="10-digit mobile number"
            value={formData.contactNo}
            onChange={handleChange}
            required
          />
        </div>

        {/* Row 3: Address */}
        <div className="field full">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            placeholder="Donor street address / premises"
            value={formData.address}
            onChange={handleChange}
            rows={2}
          />
        </div>

        {/* Row 4: District and PIN */}
        <div className="field">
          <label htmlFor="district">District *</label>
          <input
            id="district"
            name="district"
            type="text"
            placeholder="e.g. Indore, Delhi, Jaipur"
            value={formData.district}
            onChange={handleChange}
            required
          />
        </div>

        <div className="field">
          <label htmlFor="pinCode">PIN Code *</label>
          <input
            id="pinCode"
            name="pinCode"
            type="text"
            placeholder="6-digit postal code"
            maxLength={6}
            value={formData.pinCode}
            onChange={handleChange}
            required
          />
        </div>

        {/* Row 5: PAN / Aadhaar and Receiver */}
        <div className="field">
          <label htmlFor="panAadhaar">PAN / Aadhaar No.</label>
          <input
            id="panAadhaar"
            name="panAadhaar"
            type="text"
            placeholder="e.g. AAACY7098K or XXXX XXXX 1234"
            value={formData.panAadhaar}
            onChange={handleChange}
          />
          <span className="fieldHint">Recommended for 80G tax benefit</span>
        </div>

        <div className="field">
          <label htmlFor="receiverName">Receiver Name / Organization *</label>
          <input
            id="receiverName"
            name="receiverName"
            type="text"
            placeholder="Receiver Name"
            value={formData.receiverName}
            onChange={handleChange}
            required
          />
        </div>

        {/* Row 6: Contribution Amount & Presets */}
        <div className="field full amountFieldContainer">
          <label htmlFor="amount">Contribution Amount (₹) *</label>
          <div className="amountInputGroup">
            <span className="currencyPrefix">₹</span>
            <input
              id="amount"
              name="amount"
              type="number"
              min="1"
              step="any"
              value={formData.amount}
              onChange={handleChange}
              className="amountInput"
              required
            />
          </div>

          <div className="amountPresets">
            {['100', '250', '500', '1000', '2500', '5000'].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => handleAmountPreset(val)}
                className={`presetBtn ${formData.amount === val ? 'activePreset' : ''}`}
              >
                ₹{val}
              </button>
            ))}
          </div>

          <div className="wordsPreviewBox">
            <span className="wordsLabel">Amount in Words:</span>
            <strong className="wordsText">{amountWords}</strong>
          </div>
        </div>

        {/* Row 7: Payment Mode & Transaction ID (Bank Verification Feature) */}
        <div className="field">
          <label htmlFor="paymentMode">Payment Mode</label>
          <select
            id="paymentMode"
            name="paymentMode"
            value={formData.paymentMode}
            onChange={handleChange}
          >
            <option value="UPI">UPI (Google Pay, PhonePe, Paytm, BHIM)</option>
            <option value="NetBanking">Net Banking (NEFT / RTGS)</option>
            <option value="IMPS">IMPS Instant Bank Transfer</option>
            <option value="Cash">Cash Receipt</option>
            <option value="Cheque">Bank Cheque / DD</option>
          </select>
        </div>

        <div className="field">
          <label htmlFor="transactionId">
            Transaction ID / UTR (Bank Verification)
          </label>
          <div className="utrInputGroup">
            <input
              id="transactionId"
              name="transactionId"
              type="text"
              placeholder="e.g. AXISNP1234567890 or 12-digit UPI RRN"
              value={formData.transactionId}
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={handleVerifyBankLive}
              disabled={isVerifyingBank || !formData.transactionId}
              className="bankVerifyButton"
              title="Verify amount directly with the bank"
            >
              {isVerifyingBank ? (
                <RefreshCw size={14} className="spinIcon" />
              ) : (
                <ShieldCheck size={14} />
              )}
              {isVerifyingBank ? 'Checking...' : 'Verify Bank'}
            </button>
          </div>
          <span className="fieldHint">
            Directly cross-checks the bank settlement credit for this amount.
          </span>
        </div>

        {/* Live Bank Verification Status Badge */}
        {bankVerificationResult.status && (
          <div className={`field full bankResultBanner ${bankVerificationResult.status}`}>
            {bankVerificationResult.status === 'VERIFIED' ? (
              <>
                <CheckCircle2 size={20} className="resultIcon verifiedIcon" />
                <div>
                  <strong>Direct Bank Verification: VERIFIED</strong>
                  <p>{bankVerificationResult.message}</p>
                  {bankVerificationResult.authRef && (
                    <small>Bank Auth Ref: {bankVerificationResult.authRef}</small>
                  )}
                </div>
              </>
            ) : (
              <>
                <AlertCircle size={20} className="resultIcon mismatchIcon" />
                <div>
                  <strong>Bank Status: {bankVerificationResult.status}</strong>
                  <p>{bankVerificationResult.message}</p>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Submit Action */}
      <div className="actions">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn submitBtn"
        >
          {isSubmitting ? (
            'Generating Digital Receipt...'
          ) : (
            <>
              <Sparkles size={18} /> Generate Digital Receipt &amp; Save
            </>
          )}
        </button>
      </div>
    </form>
  );
}
