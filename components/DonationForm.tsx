'use client';

import React, { useState, useEffect } from 'react';
import { amountToIndianWords } from '@/lib/number-to-words';
import { AlertCircle, Sparkles } from 'lucide-react';
import { ReceiptData } from './DigitalReceipt';
import { saveReceiptLocally } from '@/lib/local-receipts';

interface Props {
  onSuccess: (receipt: ReceiptData) => void;
}

export default function DonationForm({ onSuccess }: Props) {
  const [formData, setFormData] = useState({
    ac: '',
    date: new Date().toLocaleDateString('en-GB'), // DD/MM/YYYY
    contributorName: '',
    address: '',
    district: '',
    pinCode: '',
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

  // Update amount in words when amount changes
  useEffect(() => {
    const num = parseFloat(formData.amount);
    if (!isNaN(num) && num > 0) {
      setAmountWords(amountToIndianWords(num));
    } else {
      setAmountWords('Zero Rupees Only');
    }
  }, [formData.amount]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleAmountPreset = (val: string) => {
    setFormData(prev => ({ ...prev, amount: val }));
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
          amount: parseFloat(formData.amount)
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create receipt');
      }

      // Immediately save to device permanent localStorage
      saveReceiptLocally(data.receipt);

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
      {errorMessage && (
        <div className="formErrorAlert">
          <AlertCircle size={18} />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="formgrid">
        {/* Row 1: Date and Contact */}
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

        {/* Row 2: Contributor Name */}
        <div className="field full">
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
                className={`presetBtn ${formData.amount === val ? "activePreset" : ""}`}
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

        {/* Row 7: Payment Mode & Transaction ID */}
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
            Transaction ID / UTR
          </label>
          <input
            id="transactionId"
            name="transactionId"
            type="text"
            placeholder="e.g. AXISNP1234567890 or 12-digit UPI RRN"
            value={formData.transactionId}
            onChange={handleChange}
          />
          <span className="fieldHint">
            Optional reference for UPI, Net Banking, or Cheque
          </span>
        </div>
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
